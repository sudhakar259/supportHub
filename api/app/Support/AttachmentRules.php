<?php

namespace App\Support;

/**
 * Validation rules for one uploaded ticket attachment, built from
 * config/attachments.php so the limit lives in exactly one place.
 *
 * mimes: checks the content-sniffed type only — a file named malware.exe with
 * plain-text content satisfies mimes:txt. extensions: additionally rejects any
 * filename extension outside the allow-list regardless of what the content
 * sniffs as, closing that gap. Both are needed.
 */
class AttachmentRules
{
    /** @return array<int, string> */
    public static function file(): array
    {
        $extensions = implode(',', config('attachments.extensions'));

        return ['file', 'max:'.config('attachments.max_kb'), "mimes:{$extensions}", "extensions:{$extensions}"];
    }

    /** "2 MB" — for messages and docs. */
    public static function maxSizeLabel(): string
    {
        $mb = config('attachments.max_kb') / 1024;

        return rtrim(rtrim(number_format($mb, 1), '0'), '.').' MB';
    }

    /** "jpg, jpeg, png, ..." */
    public static function extensionsLabel(): string
    {
        return implode(', ', config('attachments.extensions'));
    }
}
