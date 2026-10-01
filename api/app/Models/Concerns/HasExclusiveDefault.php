<?php

namespace App\Models\Concerns;

/**
 * Previously nothing stopped two rows from both having is_default=true —
 * e.g. TicketPriority::default() (used on ticket creation whenever no
 * priority is explicitly given) uses firstOrFail() on the first match, so
 * behavior with 2+ defaults was "whichever the DB returns first," silently
 * and non-deterministically. QA finding, 2026-10-01.
 *
 * Demotes every other row of the same model to is_default=false whenever
 * one is saved with is_default=true, so exactly one default can ever exist
 * at a time.
 */
trait HasExclusiveDefault
{
    protected static function bootHasExclusiveDefault(): void
    {
        static::saving(function (self $model) {
            if (! $model->is_default) {
                return;
            }

            static::query()
                ->where('is_default', true)
                ->when($model->exists, fn ($query) => $query->whereKeyNot($model->getKey()))
                ->update(['is_default' => false]);
        });
    }
}
