<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case HeadReferee = 'head_referee';
    case Referee = 'referee';
    case Viewer = 'viewer';
}
