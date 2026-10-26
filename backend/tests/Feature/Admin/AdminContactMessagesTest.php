<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Enums\ContactMessageStatus;
use App\Enums\EmailNotificationStatus;
use App\Jobs\SendContactMessageNotification;
use App\Models\AdminUser;
use App\Models\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AdminContactMessagesTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/admin/contact-messages';

    private function actingAsRole(AdminRole $role): AdminUser
    {
        $admin = AdminUser::factory()->role($role)->create();
        $this->actingAs($admin, 'admin')->fromFrontend();

        return $admin;
    }

    public function test_store_managers_cannot_see_messages(): void
    {
        $message = ContactMessage::factory()->create();
        $this->actingAsRole(AdminRole::StoreManager);

        $this->getJson(self::URL)->assertForbidden();
        $this->getJson(self::URL."/{$message->id}")->assertForbidden();
    }

    public function test_content_editors_can_view_but_not_change_messages(): void
    {
        $message = ContactMessage::factory()->create();
        $this->actingAsRole(AdminRole::ContentEditor);

        $this->getJson(self::URL)->assertOk()->assertJsonCount(1, 'data');
        $this->getJson(self::URL."/{$message->id}")->assertOk()->assertJsonPath('data.status', 'new');
        $this->patchJson(self::URL."/{$message->id}", ['status' => 'resolved'])->assertForbidden();
        $this->postJson(self::URL."/{$message->id}/resend-notification")->assertForbidden();

        $this->assertSame(ContactMessageStatus::New, $message->refresh()->status);
    }

    public function test_list_is_newest_first_and_filterable(): void
    {
        $this->actingAsRole(AdminRole::Support);
        $old = ContactMessage::factory()->create(['email' => 'old@example.com']);
        $resolved = ContactMessage::factory()->create(['status' => ContactMessageStatus::Resolved]);
        $jovie = ContactMessage::factory()->create(['site' => 'jovie', 'first_name' => 'Searchable']);

        $this->getJson(self::URL)->assertOk()
            ->assertJsonPath('data.0.id', $jovie->id)
            ->assertJsonPath('data.2.id', $old->id);
        $this->getJson(self::URL.'?status=resolved')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $resolved->id);
        $this->getJson(self::URL.'?site=jovie')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $jovie->id);
        $this->getJson(self::URL.'?search=old@')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $old->id);
        $this->getJson(self::URL.'?search=searchable')->assertJsonCount(1, 'data');
        $this->getJson(self::URL.'?search=%')->assertJsonCount(0, 'data');
        $this->getJson(self::URL.'?status=bogus')->assertUnprocessable();
    }

    public function test_opening_a_new_message_marks_it_read_for_managers(): void
    {
        $message = ContactMessage::factory()->create();
        $this->actingAsRole(AdminRole::Support);

        $this->getJson(self::URL."/{$message->id}")->assertOk()->assertJsonPath('data.status', 'read');

        $this->assertNotNull($message->refresh()->read_at);
    }

    public function test_support_can_resolve_annotate_and_assign(): void
    {
        $message = ContactMessage::factory()->create();
        $support = $this->actingAsRole(AdminRole::Support);

        $this->patchJson(self::URL."/{$message->id}", [
            'status' => 'resolved',
            'admin_notes' => 'Called back on Monday.',
            'assigned_admin_id' => $support->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'resolved')
            ->assertJsonPath('data.assigned_admin.id', $support->id);

        $message->refresh();
        $this->assertNotNull($message->resolved_at);
        $this->assertNotNull($message->read_at);
        $this->assertSame('Called back on Monday.', $message->admin_notes);

        $this->patchJson(self::URL."/{$message->id}", ['status' => 'in_progress'])->assertOk();
        $this->assertNull($message->refresh()->resolved_at);
    }

    public function test_messages_can_only_be_assigned_to_active_admins_who_can_view_them(): void
    {
        $message = ContactMessage::factory()->create();
        $this->actingAsRole(AdminRole::Support);
        $storeManager = AdminUser::factory()->role(AdminRole::StoreManager)->create();
        $inactiveSupport = AdminUser::factory()->role(AdminRole::Support)->inactive()->create();

        foreach ([$storeManager->id, $inactiveSupport->id, 999999] as $assignee) {
            $this->patchJson(self::URL."/{$message->id}", ['assigned_admin_id' => $assignee])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('assigned_admin_id');
        }
    }

    public function test_resend_queues_the_notification_again(): void
    {
        Queue::fake();
        $message = ContactMessage::factory()->create();
        $message->forceFill(['email_notification_status' => EmailNotificationStatus::Failed])->save();
        $this->actingAsRole(AdminRole::Support);

        $this->postJson(self::URL."/{$message->id}/resend-notification")->assertStatus(202);

        Queue::assertPushed(SendContactMessageNotification::class, fn ($job) => $job->contactMessage->is($message));
        $this->assertSame(EmailNotificationStatus::Pending, $message->refresh()->email_notification_status);
    }
}
