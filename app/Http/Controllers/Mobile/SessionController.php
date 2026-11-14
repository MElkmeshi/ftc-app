<?php

namespace App\Http\Controllers\Mobile;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Requests\MobileSignInRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Sign-in for the volunteer app. A device gets a personal access token,
 * which carries the same role and abilities as the web session would.
 */
class SessionController extends Controller
{
    /**
     * What the app needs before anyone signs in: whether this server hands
     * out FTC Live's passwordless default users, and for which roles.
     */
    public function config(Request $request): JsonResponse
    {
        $localSignIn = (bool) config('competition.local_sign_in');

        return response()->json([
            'name' => config('app.name'),
            'version' => app(HandleInertiaRequests::class)->version($request),
            'now' => now()->getTimestampMs(),
            'local_sign_in' => $localSignIn,
            'roles' => $localSignIn
                ? collect(UserRole::options())->reject(fn (array $role): bool => $role['value'] === UserRole::Viewer->value)->values()
                : [],
        ]);
    }

    public function store(MobileSignInRequest $request): JsonResponse
    {
        $user = $request->validated('role') !== null ? $this->defaultUser($request) : $this->accountUser($request);

        return response()->json([
            'token' => $user->createToken($request->validated('device_name') ?? 'mobile')->plainTextToken,
            'user' => $this->describe($user),
        ], 201);
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->describe($request->user())]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    private function defaultUser(MobileSignInRequest $request): User
    {
        abort_unless(config('competition.local_sign_in'), 404);

        return User::defaultFor(UserRole::from($request->validated('role')));
    }

    private function accountUser(MobileSignInRequest $request): User
    {
        $user = User::query()->where('email', $request->validated('email'))->first();

        if ($user === null || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        return $user;
    }

    /**
     * @return array{id: int, name: string, email: string, role: string|null, role_label: string|null, abilities: list<string>}
     */
    private function describe(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role?->value,
            'role_label' => $user->role?->label(),
            'abilities' => $user->role?->abilities() ?? [],
        ];
    }
}
