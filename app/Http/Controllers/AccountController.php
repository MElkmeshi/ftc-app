<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\GenerateOfficialAccountsRequest;
use App\Http\Requests\StoreAccountRequest;
use App\Http\Requests\UpdateAccountRequest;
use App\Models\User;
use App\Support\SignInLink;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Server-wide sign-in accounts for officials, like FTC Live's account
 * manager. Passwords are generated here and shown exactly once.
 */
class AccountController extends Controller
{
    public const GENERATED_EMAIL_DOMAIN = 'officials.local';

    public function index(): Response
    {
        return Inertia::render('accounts/index', [
            'accounts' => User::query()
                ->orderByRaw('case role when ? then 0 when ? then 1 when ? then 2 else 3 end', [UserRole::Admin->value, UserRole::HeadReferee->value, UserRole::Referee->value])
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role', 'created_at']),
            'roles' => UserRole::options(),
            'signInLinkDays' => SignInLink::VALID_FOR_DAYS,
        ]);
    }

    public function store(StoreAccountRequest $request): RedirectResponse
    {
        $password = $this->generatePassword();
        $account = $this->createAccount($request->validated('name'), $request->validated('email'), UserRole::from($request->validated('role')), $password);

        Inertia::flash('credentials', [$this->credential($account, $password)]);

        return back();
    }

    /**
     * Creates numbered head referee, referee and inspector logins (e.g. referee1@officials.local)
     * in one go, skipping numbers that already exist.
     */
    public function generate(GenerateOfficialAccountsRequest $request): RedirectResponse
    {
        $credentials = [];

        foreach ([[UserRole::HeadReferee, 'headref', 'Head Referee', $request->integer('head_referees')], [UserRole::Referee, 'referee', 'Referee', $request->integer('referees')], [UserRole::Inspector, 'inspector', 'Inspector', $request->integer('inspectors')]] as [$role, $prefix, $title, $count]) {
            $number = 0;

            for ($created = 0; $created < $count; $created++) {
                do {
                    $number++;
                    $email = "{$prefix}{$number}@".self::GENERATED_EMAIL_DOMAIN;
                } while (User::query()->where('email', $email)->exists());

                $password = $this->generatePassword();
                $credentials[] = $this->credential($this->createAccount("{$title} {$number}", $email, $role, $password), $password);
            }
        }

        Inertia::flash('credentials', $credentials);

        return back();
    }

    public function update(UpdateAccountRequest $request, User $account): RedirectResponse
    {
        $account->forceFill([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'role' => UserRole::from($request->validated('role')),
        ])->save();

        return back();
    }

    public function resetPassword(User $account): RedirectResponse
    {
        $password = $this->generatePassword();
        $account->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();

        Inertia::flash('credentials', [$this->credential($account, $password)]);

        return back();
    }

    public function destroy(Request $request, User $account): RedirectResponse
    {
        abort_if($account->is($request->user()), 422, 'You cannot delete your own account.');

        $account->delete();

        return back();
    }

    private function createAccount(string $name, string $email, UserRole $role, string $password): User
    {
        $account = new User(['name' => $name, 'email' => $email, 'password' => $password]);
        $account->forceFill(['role' => $role, 'email_verified_at' => now()])->save();

        return $account;
    }

    /**
     * Short, unambiguous passwords that are easy to read off a sheet and type on a tablet.
     */
    private function generatePassword(): string
    {
        $alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';

        return collect(range(1, 3))
            ->map(fn (): string => collect(range(1, 4))->map(fn (): string => $alphabet[random_int(0, strlen($alphabet) - 1)])->implode(''))
            ->implode('-');
    }

    /**
     * @return array{name: string, email: string, role: string, password: string, sign_in_link: string}
     */
    private function credential(User $account, string $password): array
    {
        return [
            'name' => $account->name,
            'email' => $account->email,
            'role' => $account->role->label(),
            'password' => $password,
            'sign_in_link' => SignInLink::for($account),
        ];
    }
}
