<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateAccountRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var User $account */
        $account = $this->route('account');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($account->id)],
            'role' => ['required', Rule::enum(UserRole::class)],
        ];
    }

    /**
     * Admins cannot demote themselves, so the server always keeps at least
     * the admin who is making the change.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->route('account')?->is($this->user()) && $this->input('role') !== UserRole::Admin->value) {
                    $validator->errors()->add('role', 'You cannot remove your own admin role.');
                }
            },
        ];
    }
}
