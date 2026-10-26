<?php

namespace App\Models;

use App\Notifications\CustomerPasswordLinkNotification;
use App\Notifications\CustomerVerifyEmailNotification;
use Database\Factories\CustomerFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * @property int $id
 * @property string $first_name
 * @property string $last_name
 * @property string $email
 * @property string|null $phone
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property string $locale
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $last_login_at
 * @property \Illuminate\Support\Carbon|null $anonymized_at
 */
class Customer extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<CustomerFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'password',
        'locale',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Mirror the column defaults so a model that was just created (not reloaded) has every
     * attribute; strict mode would otherwise reject reading e.g. email_verified_at.
     */
    protected $attributes = [
        'locale' => 'en',
        'is_active' => true,
        'email_verified_at' => null,
        'last_login_at' => null,
        'remember_token' => null,
        'anonymized_at' => null,
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'anonymized_at' => 'datetime',
        ];
    }

    /** @return HasMany<CustomerAddress, $this> */
    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class);
    }

    /** @return HasMany<CartItem, $this> */
    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function fullName(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new CustomerPasswordLinkNotification($token));
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new CustomerVerifyEmailNotification);
    }
}
