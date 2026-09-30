<?php

namespace App\Enums;

enum TicketMessageType: string
{
    case CustomerMessage = 'customer_message';
    case AgentReply = 'agent_reply';
    case InternalNote = 'internal_note';
}
