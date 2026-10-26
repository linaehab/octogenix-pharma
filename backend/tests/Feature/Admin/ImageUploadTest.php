<?php

namespace Tests\Feature\Admin;

use App\Enums\AdminRole;
use App\Models\AdminUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageUploadTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/admin/uploads/images';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_content_editors_and_store_managers_can_upload_images(): void
    {
        foreach ([AdminRole::ContentEditor, AdminRole::StoreManager] as $role) {
            $this->actingAs(AdminUser::factory()->role($role)->create(), 'admin')->fromFrontend();

            $path = $this->postJson(self::URL, ['image' => $this->fakePng('../../evil name.png')])
                ->assertCreated()
                ->json('data.path');

            $this->assertMatchesRegularExpression('#^uploads/images/\d{4}/\d{2}/[0-9a-f-]{36}\.png$#', $path);
            Storage::disk('public')->assertExists($path);
        }
    }

    public function test_support_cannot_upload(): void
    {
        $this->actingAs(AdminUser::factory()->role(AdminRole::Support)->create(), 'admin')->fromFrontend();

        $this->postJson(self::URL, ['image' => $this->fakePng()])->assertForbidden();
    }

    public function test_svg_non_images_and_oversized_files_are_rejected(): void
    {
        $this->actingAs(AdminUser::factory()->role(AdminRole::ContentEditor)->create(), 'admin')->fromFrontend();

        $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        $this->postJson(self::URL, ['image' => $svg])->assertUnprocessable()->assertJsonValidationErrors('image');

        $this->postJson(self::URL, ['image' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf')])
            ->assertUnprocessable();

        $this->postJson(self::URL, ['image' => $this->fakePng('big.png', reportedKilobytes: 6000)])
            ->assertUnprocessable();

        $this->assertSame([], Storage::disk('public')->allFiles());
    }
}
