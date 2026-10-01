<?php

namespace App\Exceptions;

use Exception;

class InvalidTicketStatusTransitionException extends Exception
{
    public static function make(string $from, string $to): self
    {
        return new self("Cannot transition a ticket from \"{$from}\" to \"{$to}\".");
    }
}
