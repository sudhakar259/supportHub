<?php

namespace Database\Seeders;

use App\Actions\Ticket\CreateTicketAction;
use App\Actions\Ticket\CreateTicketMessageAction;
use App\Actions\Ticket\ResolveTicketAction;
use App\Enums\TicketMessageType;
use App\Models\Customer;
use App\Models\TicketCategory;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoTicketSeeder extends Seeder
{
    public function run(): void
    {
        $createTicket = app(CreateTicketAction::class);
        $createMessage = app(CreateTicketMessageAction::class);
        $resolveTicket = app(ResolveTicketAction::class);

        $customers = Customer::all();
        $category = TicketCategory::whereNotNull('parent_id')->first();
        $agent = User::whereHas('roles', fn ($q) => $q->where('name', 'Agent'))->first();

        if ($customers->isEmpty()) {
            return;
        }

        $demoTickets = [
            ['subject' => 'Unable to log into my account', 'description' => "I keep getting an 'invalid credentials' error even though I'm sure my password is correct.", 'resolve' => false],
            ['subject' => 'Refund request for duplicate charge', 'description' => 'I was charged twice for my last invoice. Please refund the duplicate.', 'resolve' => false],
            ['subject' => 'Feature request: dark mode', 'description' => 'Would love to see a dark mode option in the dashboard.', 'resolve' => true],
            ['subject' => 'Integration webhook failing silently', 'description' => 'Our webhook endpoint stopped receiving events three days ago with no error shown.', 'resolve' => false],
            ['subject' => 'How do I change my subscription plan?', 'description' => "Looking to upgrade from the Starter to the Pro plan — what's the process?", 'resolve' => true],
        ];

        foreach ($demoTickets as $index => $data) {
            $customer = $customers[$index % $customers->count()];

            $ticket = $createTicket->execute($customer, [
                'subject' => $data['subject'],
                'description' => $data['description'],
                'category_id' => $category?->id,
            ]);

            if ($agent) {
                $createMessage->execute($ticket, $agent, TicketMessageType::AgentReply, 'Thanks for reaching out — looking into this now.');
            }

            if ($data['resolve'] && $agent) {
                $resolveTicket->execute($ticket, $agent, 'Resolved per demo seed data.');
            }
        }
    }
}
