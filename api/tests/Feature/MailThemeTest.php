<?php

use Illuminate\Notifications\Messages\MailMessage;

/** Renders a typical notification (greeting, text, button, sign-off) to the HTML a customer receives. */
function renderedEmail(string $level = 'primary'): string
{
    return (string) (new MailMessage)
        ->subject('We received your ticket TKT-1')
        ->greeting('Hello Jamie,')
        ->line('Your ticket has been created.')
        ->action('View ticket', 'https://example.com/tickets/1', )
        ->level($level)
        ->salutation('Regards, Help')
        ->render();
}

it('uses the product palette in emails', function () {
    $html = strtolower(renderedEmail());

    expect($html)
        ->toContain('#a33900')   // primary orange: button, links
        ->toContain('#5a4138')   // body text
        ->toContain('#f8f9ff');  // surface
});

it('no longer carries the framework theme\'s own colors', function () {
    $html = strtolower(renderedEmail());

    foreach (['#18181b', '#52525b', '#a1a1aa', '#e4e4e7', '#fafafa', '#16a34a', '#dc2626', '#213145', '#475569', '#f8fafc'] as $old) {
        expect($html)->not->toContain($old);
    }
});

it('colors success and error buttons with the palette\'s success and error roles', function () {
    expect(strtolower(renderedEmail('success')))->toContain('#15803d')
        ->and(strtolower(renderedEmail('error')))->toContain('#ba1a1a');
});

it('uses the supporthub theme by default', function () {
    expect(config('mail.markdown.theme'))->toBe('supporthub');
});

it('renders the supplied DeskZeal wordmark with an absolute image address', function () {
    config(['app.name' => 'DeskZeal', 'app.url' => 'https://api.deskzeal.test']);

    expect(renderedEmail())->toContain('https://api.deskzeal.test/branding/deskzeal-logo.png')
        ->toContain('>Zeal</span>');
});
