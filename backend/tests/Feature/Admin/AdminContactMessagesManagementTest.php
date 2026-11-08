<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminPermission;
use App\Enums\AdminRole;
use App\Enums\ContactMessageStatus;
use App\Models\AdminAuditLog;
use App\Models\AdminNotification;
use App\Models\AdminUser;
use App\Models\ContactMessage;
use App\Services\AdminNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/** Contact messages in the dashboard: list, details, statuses, notifications and audit. */
class AdminContactMessagesManagementTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/admin/contact-messages';

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        Mail::fake();
    }

    private function signIn(AdminRole $role = AdminRole::Support): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    public function test_a_submission_notifies_admins_who_can_view_messages_with_a_link_and_no_personal_details(): void
    {
        $support = AdminUser::factory()->role(AdminRole::Support)->create();
        $editor = AdminUser::factory()->role(AdminRole::ContentEditor)->create();
        $manager = AdminUser::factory()->role(AdminRole::StoreManager)->create();
        AdminUser::factory()->role(AdminRole::Support)->inactive()->create();

        $this->postJson('/api/v1/contact-messages', [
            'first_name' => 'Mona', 'last_name' => 'Hassan', 'email' => 'mona@example.com', 'phone' => '01012345678',
            'subject' => 'partnership', 'message' => 'Secret details about our offer.',
        ])->assertCreated();

        $message = ContactMessage::sole();
        $this->assertSame(ContactMessageStatus::New, $message->status);

        $notifications = AdminNotification::where('type', 'messages.received')->get();
        $this->assertEqualsCanonicalizing([$support->id, $editor->id], $notifications->pluck('admin_user_id')->all());
        $this->assertNotContains($manager->id, $notifications->pluck('admin_user_id')->all());
        $first = $notifications->first();
        $this->assertSame("/admin/contact-messages/{$message->id}", $first->link);
        $this->assertEqualsCanonicalizing(['message_id' => $message->id, 'subject' => 'partnership', 'site' => 'corporate'], $first->data);
        $payload = json_encode($notifications->pluck('data'));
        foreach (['mona@example.com', 'Mona', 'Hassan', 'Secret', '0101'] as $private) {
            $this->assertStringNotContainsString($private, $payload);
        }

        // The same message never notifies twice.
        app(AdminNotifier::class)->notify('messages.received', AdminPermission::ViewMessages, ['message_id' => $message->id],
            "/admin/contact-messages/{$message->id}", "messages.received:{$message->id}");
        $this->assertSame(2, AdminNotification::where('type', 'messages.received')->count());
    }

    public function test_the_list_shows_a_preview_and_searches_filters_sorts_and_pages_on_the_server(): void
    {
        $this->signIn();
        Carbon::setTestNow('2026-11-01 08:00:00');
        $old = ContactMessage::factory()->create(['first_name' => 'Mona', 'last_name' => 'Hassan', 'subject' => 'distribution',
            'message' => str_repeat('Long text ', 40)]);
        Carbon::setTestNow('2026-11-05 08:00:00');
        $mid = ContactMessage::factory()->create(['email' => 'buyer@pharma.example', 'subject' => 'general']);
        Carbon::setTestNow('2026-11-08 08:00:00');
        $new = ContactMessage::factory()->create(['status' => ContactMessageStatus::Replied, 'subject' => 'other']);
        Carbon::setTestNow();

        $row = $this->getJson(self::URL.'?per_page=2')->assertOk()
            ->assertJsonPath('meta.total', 3)->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('data.0.id', $new->id)
            ->json('data.0');
        $this->assertArrayNotHasKey('message', $row);
        $this->assertArrayNotHasKey('admin_notes', $row);
        $this->assertArrayNotHasKey('phone', $row);

        $oldest = $this->getJson(self::URL.'?sort=oldest')->json('data.0');
        $this->assertSame($old->id, $oldest['id']);
        $this->assertLessThanOrEqual(143, mb_strlen($oldest['preview']));

        $this->getJson(self::URL.'?search=mona hassan')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $old->id);
        $this->getJson(self::URL.'?search=pharma.example')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mid->id);
        $this->getJson(self::URL.'?search=distribution')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $old->id);
        $this->getJson(self::URL.'?status=replied')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $new->id);
        $this->getJson(self::URL.'?from=2026-11-05&to=2026-11-05')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mid->id);
        $this->getJson(self::URL.'?from=2026-11-06&to=2026-11-01')->assertUnprocessable();
        $this->getJson(self::URL.'?sort=random')->assertUnprocessable();
    }

    public function test_opening_marks_read_only_for_managers_and_details_return_text_as_plain_data(): void
    {
        $message = ContactMessage::factory()->create(['message' => '<script>alert(1)</script> Hello']);

        $this->signIn(AdminRole::ContentEditor);
        $this->getJson(self::URL."/{$message->id}")->assertOk()
            ->assertJsonPath('data.status', 'new')
            ->assertJsonPath('data.message', '<script>alert(1)</script> Hello');
        $this->assertSame(ContactMessageStatus::New, $message->refresh()->status, 'View-only admins do not change anything.');
        $this->patchJson(self::URL."/{$message->id}", ['status' => 'replied'])->assertForbidden();

        $this->signIn(AdminRole::Support);
        $this->getJson(self::URL."/{$message->id}")->assertJsonPath('data.status', 'read');
        $this->assertNotNull($message->refresh()->read_at);
        $this->assertSame(0, AdminAuditLog::count(), 'Opening is not an audited action.');
    }

    public function test_statuses_follow_the_allowed_changes_and_are_audited_without_personal_details(): void
    {
        $message = ContactMessage::factory()->create(['email' => 'mona@example.com', 'message' => 'Private text']);
        $admin = $this->signIn();

        $this->patchJson(self::URL."/{$message->id}", ['status' => 'replied'])
            ->assertUnprocessable()->assertJsonPath('errors.status.0', 'Open the message before marking it as replied.');

        $this->getJson(self::URL."/{$message->id}")->assertJsonPath('data.status', 'read');
        $this->patchJson(self::URL."/{$message->id}", ['status' => 'replied', 'expected_status' => 'read'])
            ->assertOk()->assertJsonPath('data.status', 'replied');

        // A screen that still shows "read" does not overwrite the newer status.
        $this->patchJson(self::URL."/{$message->id}", ['status' => 'read', 'expected_status' => 'read'])
            ->assertStatus(409)->assertJsonPath('current.status', 'replied');

        $this->patchJson(self::URL."/{$message->id}", ['status' => 'new'])->assertUnprocessable();
        $this->patchJson(self::URL."/{$message->id}", ['status' => 'read', 'expected_status' => 'replied'])
            ->assertOk()->assertJsonPath('data.status', 'read');
        $this->patchJson(self::URL."/{$message->id}", ['admin_notes' => 'Called her back, mona@example.com'])->assertOk();

        $logs = AdminAuditLog::orderBy('id')->get();
        $this->assertSame(['messages.marked_replied', 'messages.status_changed', 'messages.updated'], $logs->pluck('action')->all());
        $this->assertSame(['contact_message', (string) $message->id, "Message #{$message->id}", $admin->id],
            [$logs[0]->subject_type, $logs[0]->subject_id, $logs[0]->subject_label, $logs[0]->admin_user_id]);
        $this->assertEquals(['status' => ['from' => 'read', 'to' => 'replied']], $logs[0]->changes);
        $everything = json_encode($logs->toArray());
        foreach (['mona@example.com', 'Private text', 'Called her back'] as $private) {
            $this->assertStringNotContainsString($private, $everything);
        }

        $this->getJson('/api/v1/admin/audit-logs?category=messages')->assertForbidden(); // support cannot read the audit log
    }

    public function test_unauthorized_requests_are_refused(): void
    {
        $message = ContactMessage::factory()->create();

        $this->getJson(self::URL)->assertUnauthorized();
        $this->getJson(self::URL."/{$message->id}")->assertUnauthorized();
        $this->patchJson(self::URL."/{$message->id}", ['status' => 'read'])->assertUnauthorized();

        $this->signIn(AdminRole::StoreManager);
        $this->getJson(self::URL)->assertForbidden();
        $this->patchJson(self::URL."/{$message->id}", ['status' => 'read'])->assertForbidden();

        $this->signIn(AdminRole::Support);
        $this->patchJson(self::URL."/{$message->id}", ['status' => 'bogus'])->assertUnprocessable();
        $this->patchJson(self::URL."/{$message->id}", ['expected_status' => 'bogus'])->assertUnprocessable();
        $this->assertSame(ContactMessageStatus::New, $message->refresh()->status);
    }
}
