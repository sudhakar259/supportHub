<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Http\Resources\TicketCategoryResource;
use App\Models\TicketCategory;
use Illuminate\Http\JsonResponse;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Categories
 *
 * Ticket categories and subcategories. A "subcategory" is simply another
 * row with parent_id set — see the architecture docs for why this
 * replaces a separate child-categories table.
 */
class TicketCategoryController extends Controller
{
    /**
     * List categories
     *
     * Returns top-level categories with their children eager-loaded.
     * Use filter[parent_id]=null to explicitly list only root categories.
     *
     * @queryParam filter[department_id] Filter by department. Example: 2
     * @queryParam filter[is_active] Filter by active status. Example: true
     * @queryParam sort Sort by name or sort_order. Example: sort_order
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "Billing", "children": []}]}
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', TicketCategory::class);

        $categories = QueryBuilder::for(TicketCategory::whereNull('parent_id'))
            ->allowedFilters(
                AllowedFilter::exact('department_id'),
                AllowedFilter::exact('is_active'),
            )
            ->allowedSorts('name', 'sort_order', 'created_at')
            ->with('children')
            ->defaultSort('sort_order')
            ->get();

        return $this->success(TicketCategoryResource::collection($categories));
    }

    /**
     * Create a category
     *
     * @bodyParam name string required Example: Billing
     * @bodyParam parent_id integer Parent category id, omit for a top-level category. Example: null
     * @bodyParam department_id integer Department this category routes to. Example: 2
     * @bodyParam description string Example: Invoicing and payment questions.
     * @bodyParam is_active boolean Defaults to true. Example: true
     * @bodyParam sort_order integer Defaults to 0. Example: 1
     *
     * @response 201 {"success": true, "message": "Category created successfully.", "data": {"id": 5, "name": "Billing"}}
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = TicketCategory::create($request->validated());

        return $this->created(new TicketCategoryResource($category), 'Category created successfully.');
    }

    /**
     * Get a category
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 1, "name": "Billing"}}
     */
    public function show(TicketCategory $category): JsonResponse
    {
        $this->authorize('view', $category);

        return $this->success(new TicketCategoryResource($category->load('children')));
    }

    /**
     * Update a category
     *
     * @bodyParam name string Example: Billing & Payments
     * @bodyParam parent_id integer Example: null
     * @bodyParam department_id integer Example: 2
     * @bodyParam is_active boolean Example: true
     *
     * @response 200 {"success": true, "message": "Category updated successfully.", "data": {"id": 1, "name": "Billing & Payments"}}
     */
    public function update(UpdateCategoryRequest $request, TicketCategory $category): JsonResponse
    {
        $category->update($request->validated());

        return $this->success(new TicketCategoryResource($category), 'Category updated successfully.');
    }

    /**
     * Delete a category
     *
     * Soft-deletes the category and cascades to its subcategories.
     * Tickets already in this category keep their category_id.
     *
     * @response 200 {"success": true, "message": "Category deleted successfully.", "data": null}
     */
    public function destroy(TicketCategory $category): JsonResponse
    {
        $this->authorize('delete', $category);

        $category->delete();

        return $this->deleted('Category deleted successfully.');
    }
}
