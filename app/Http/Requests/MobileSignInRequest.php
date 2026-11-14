<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A device signs in either with an account's email and password or, on a
 * closed event network, as one of the default users by role.
 */
class MobileSignInRequest extends FormRequest
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'role' => ['required_without:email', 'nullable', Rule::enum(UserRole::class)->except([UserRole::Viewer])],
            'email' => ['required_without:role', 'nullable', 'string', 'email'],
            'password' => ['required_with:email', 'nullable', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ];
    }
}
