<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketTag;
use App\Services\TicketActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * @group Ticket Tags
 *
 * Free-form labels agents put on tickets ("vip", "refund", "bug") to group and
 * filter them. Staff only: customers can see tags on their tickets' staff views
 * nowhere and cannot set them.
 */
class TicketTagController extends Controller
{
    public const MAX_PER_TICKET = 10;

    public function __construct(private TicketActivityLogger $activity) {}

    /**
     * List tags
     *
     * Every tag in use in the workspace, for autocomplete and filters.
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"name": "vip", "slug": "vip", "color": "#6B7280"}]}
     */
    public function index(Request $request): JsonResponse
    {
        abort_if($request->user()->isCustomer(), 403, 'You do not have permission to perform this action.');
        abort_unless($request->user()->can('tickets.view'), 403, 'You do not have permission to perform this action.');

        return $this->success(
            TicketTag::orderBy('name')->get(['name', 'slug', 'color'])->map(fn (TicketTag $t) => [
                'name' => $t->name, 'slug' => $t->slug, 'color' => $t->color,
            ])->all()
        );
    }

    /**
     * Set a ticket's tags
     *
     * Replaces the ticket's tags with exactly this list. Tags that don't exist yet
     * are created. Names are trimmed, lower-cased and de-duplicated.
     *
     * @urlParam ticket string required The ticket's id. Example: 01hxyz0123456789abcdefghj
     *
     * @bodyParam tags string[] required Up to 10 tags, each up to 30 characters. An empty array removes all tags. Example: ["vip", "refund"]
     *
     * @response 200 {"success": true, "message": "Tags updated.", "data": ["vip", "refund"]}
     */
    public function sync(Request $request, Ticket $ticket): JsonResponse
    {
        $user = $request->user();
        abort_if($user->isCustomer(), 403, 'You do not have permission to perform this action.');
        $this->authorize('update', $ticket);

        $data = $request->validate([
            'tags' => ['present', 'array', 'max:'.self::MAX_PER_TICKET],
            // Blank entries arrive as null (the framework turns "" into null) and are simply dropped below.
            'tags.*' => ['nullable', 'string', 'max:30'],
        ]);

        $names = collect($data['tags'])
            ->map(fn (?string $name) => Str::lower(trim(preg_replace('/\s+/', ' ', (string) $name))))
            ->filter(fn (string $name) => $name !== '' && Str::slug($name) !== '')
            ->unique(fn (string $name) => Str::slug($name))
            ->values();

        $before = $ticket->tags()->pluck('name')->sort()->values()->all();

        DB::transaction(function () use ($ticket, $names) {
            $ids = $names->map(fn (string $name) => TicketTag::firstOrCreate(['slug' => Str::slug($name)], ['name' => $name])->id);
            $ticket->tags()->sync($ids->all());
        });

        $after = $ticket->tags()->pluck('name')->sort()->values()->all();

        if ($before !== $after) {
            $this->activity->log($ticket, 'tags_changed', 'Tags: '.($after ? implode(', ', $after) : 'none'), $user);
        }

        return $this->success($ticket->tags()->orderBy('name')->pluck('name')->all(), 'Tags updated.');
    }
}
