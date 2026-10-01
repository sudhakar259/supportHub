<?php

namespace App\Services;

class TemplateRenderingService
{
    /**
     * @param  array<string, string|int|null>  $variables  Keys without braces, e.g. ['ticket_number' => 'TKT-2026-000125'].
     */
    public function render(string $template, array $variables): string
    {
        $replacements = [];

        foreach ($variables as $key => $value) {
            $replacements['{'.$key.'}'] = (string) ($value ?? '');
        }

        return strtr($template, $replacements);
    }
}
