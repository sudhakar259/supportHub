{{-- The platform mail theme with the workspace's colour in place of the default orange. --}}
{!! strtr(file_get_contents(resource_path('views/vendor/mail/html/themes/supporthub.css')), ['#a33900' => $brandPrimary ?? '#a33900']) !!}
