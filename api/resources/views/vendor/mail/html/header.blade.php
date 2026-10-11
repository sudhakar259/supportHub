@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
@if (trim($slot) === 'DeskZeal')
<img src="{{ rtrim((string) (config('app.asset_url') ?: config('app.url')), '/') }}/branding/deskzeal-logo.png" class="brand-logo" width="44" height="41" alt="" style="display: inline-block; vertical-align: middle; width: 44px; height: auto;">
<span style="display: inline-block; vertical-align: middle; padding-left: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 28px; font-weight: 700; letter-spacing: -1px; color: #0b1c30;">Desk<span class="brand-accent">Zeal</span>.</span>
@else
{!! $slot !!}
@endif
</a>
</td>
</tr>
