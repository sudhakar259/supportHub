<?php

use App\Http\Controllers\Api\V1\MembershipPlanController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:auth')->get('/membership-plans', [MembershipPlanController::class, 'index']);
