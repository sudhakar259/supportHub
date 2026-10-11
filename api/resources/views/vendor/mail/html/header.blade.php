@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
@if (trim($slot) === 'DeskNu')
<img src="{{ rtrim((string) (config('app.asset_url') ?: config('app.url')), '/') }}/branding/light-mode-desknu-logo.png" class="brand-logo" width="240" height="77" alt="DeskNu">
@else
{!! $slot !!}
@endif
</a>
</td>
</tr>
