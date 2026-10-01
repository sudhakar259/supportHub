<?php

namespace App\Exceptions;

use Exception;

class PlanLimitExceededException extends Exception
{
    public function __construct(public string $feature, public ?int $limit)
    {
        parent::__construct("Your plan's limit of {$limit} for \"{$feature}\" has been reached. Upgrade your plan to continue.");
    }
}
