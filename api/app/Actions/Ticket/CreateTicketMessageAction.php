<?php

namespace App\Actions\Ticket;

use App\Enums\TicketMessageType;
use App\Events\AgentReplied;
use App\Events\CustomerReplied;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Services\TicketActivityLogger;
use Illuminate\Support\Facades\DB;

class CreateTicketMessageAction
{
    public function __construct(private TicketActivityLogger $activity) {}

    public function execute(Ticket $ticket, User $author, TicketMessageType $type, string $body): TicketMessage
    {
        $message = DB::transaction(function () use ($ticket, $author, $type, $body) {
            $message = $ticket->messages()->create([
                'author_id' => $author->id,
                'type' => $type,
                'body' => $body,
            ]);

            if ($type === TicketMessageType::AgentReply && ! $ticket->first_response_at) {
                $ticket->forceFill(['first_response_at' => now()])->save();

                if ($ticket->sla) {
                    $ticket->sla->update([
                        'first_response_met_at' => now(),
                        'first_response_breached' => now()->greaterThan($ticket->sla->first_response_due_at),
                    ]);
                }
            }

            $this->activity->log(
                $ticket,
                'message_'.$type->value,
                match ($type) {
                    TicketMessageType::CustomerMessage => "{$author->name} replied",
                    TicketMessageType::AgentReply => "{$author->name} replied",
                    TicketMessageType::InternalNote => "{$author->name} added an internal note",
                },
                $author
            );

            return $message;
        });

        match ($type) {
            TicketMessageType::CustomerMessage => event(new CustomerReplied($message)),
            TicketMessageType::AgentReply => event(new AgentReplied($message)),
            TicketMessageType::InternalNote => null,
        };

        return $message;
    }
}
