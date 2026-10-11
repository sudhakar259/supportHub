<?php

namespace Database\Seeders;

use App\Models\NotificationTemplate;
use Illuminate\Database\Seeder;

class NotificationTemplateSeeder extends Seeder
{
    public const TEMPLATES = [
        [
            'key' => 'ticket_created',
            'name' => 'Ticket Created',
            'subject' => 'We received your ticket {ticket_number}',
            'body' => "Hi {customer_name},\n\nYour ticket \"{ticket_subject}\" has been created and assigned number {ticket_number}. Our {department} team will respond shortly.\n\nView your ticket: {ticket_url}",
        ],
        [
            'key' => 'ticket_assigned',
            'name' => 'Ticket Assigned',
            'subject' => 'Ticket {ticket_number} assigned to you',
            'body' => "Hi {agent_name},\n\nTicket {ticket_number} (\"{ticket_subject}\") has been assigned to you in {department}. Priority: {ticket_priority}.\n\nView ticket: {ticket_url}",
        ],
        [
            'key' => 'ticket_status_changed',
            'name' => 'Ticket Status Changed',
            'subject' => 'Ticket {ticket_number} is now {ticket_status}',
            'body' => "Hi {customer_name},\n\nThe status of your ticket {ticket_number} (\"{ticket_subject}\") changed to {ticket_status}.\n\nView ticket: {ticket_url}",
        ],
        [
            'key' => 'customer_replied',
            'name' => 'Customer Replied',
            'subject' => 'New customer reply on ticket {ticket_number}',
            'body' => "Hi {agent_name},\n\n{customer_name} replied to ticket {ticket_number} (\"{ticket_subject}\").\n\nView ticket: {ticket_url}",
        ],
        [
            'key' => 'agent_replied',
            'name' => 'Agent Replied',
            'subject' => 'New reply on your ticket {ticket_number}',
            'body' => "Hi {customer_name},\n\n{agent_name} replied to your ticket {ticket_number} (\"{ticket_subject}\"):\n\n{reply_body}\n\nView ticket: {ticket_url}",
        ],
        [
            'key' => 'ticket_escalated',
            'name' => 'Ticket Escalated',
            'subject' => 'Ticket {ticket_number} has been escalated',
            'body' => "Hi {agent_name},\n\nTicket {ticket_number} (\"{ticket_subject}\") has been escalated and now requires priority attention. Priority: {ticket_priority}.\n\nView ticket: {ticket_url}",
        ],
        [
            'key' => 'ticket_resolved',
            'name' => 'Ticket Resolved',
            'subject' => 'Ticket {ticket_number} has been resolved',
            'body' => "Hi {customer_name},\n\nYour ticket {ticket_number} (\"{ticket_subject}\") has been marked resolved. If this doesn't fully address your issue, you can reopen it.\n\nView ticket: {ticket_url}",
        ],
        [
            'key' => 'ticket_closed',
            'name' => 'Ticket Closed',
            'subject' => 'Ticket {ticket_number} has been closed',
            'body' => "Hi {customer_name},\n\nYour ticket {ticket_number} (\"{ticket_subject}\") has been closed. Thank you for contacting us.\n\nView ticket: {ticket_url}",
        ],
        [
            'key' => 'ticket_reopened',
            'name' => 'Ticket Reopened',
            'subject' => 'Ticket {ticket_number} has been reopened',
            'body' => "Hi {agent_name},\n\nTicket {ticket_number} (\"{ticket_subject}\") was reopened by {customer_name} and needs attention.\n\nView ticket: {ticket_url}",
        ],
    ];

    public function run(): void
    {
        foreach (self::TEMPLATES as $template) {
            NotificationTemplate::updateOrCreate(
                ['key' => $template['key']],
                $template + ['channel' => 'mail', 'is_active' => true]
            );
        }
    }
}
