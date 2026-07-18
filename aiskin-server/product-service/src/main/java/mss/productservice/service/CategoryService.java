package mss.productservice.service;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.CategoryRequest;
import mss.productservice.dto.response.CategoryResponse;
import mss.productservice.exception.DuplicateResourceException;
import mss.productservice.exception.ResourceNotFoundException;
import mss.productservice.model.Category;
import mss.productservice.repository.CategoryRepository;
import mss.productservice.util.SlugUtil;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService implements ICategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream().map(this::toResponse).toList();
    }

    public List<CategoryResponse> getActiveCategories() {
        return categoryRepository.findByIsActiveTrueOrderByDisplayOrderAsc().stream().map(this::toResponse).toList();
    }

    public CategoryResponse getCategoryById(String id) {
        Category category = categoryRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        return toResponse(category);
    }

    public CategoryResponse getCategoryBySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Category", "slug", slug));
        return toResponse(category);
    }

    public CategoryResponse createCategory(CategoryRequest request) {
        String slug = SlugUtil.toSlug(request.getName());
        if (categoryRepository.existsBySlug(slug)) {
            throw new DuplicateResourceException("Category", "slug", slug);
        }
        Category category = Category.builder().name(request.getName()).slug(slug).description(request.getDescription()).displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0).isActive(true).build();
        return toResponse(categoryRepository.save(category));
    }

    public CategoryResponse updateCategory(String id, CategoryRequest request) {
        Category category = categoryRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        String newSlug = SlugUtil.toSlug(request.getName());
        if (!newSlug.equals(category.getSlug()) && categoryRepository.existsBySlug(newSlug)) {
            throw new DuplicateResourceException("Category", "slug", newSlug);
        }
        category.setName(request.getName());
        category.setSlug(newSlug);
        category.setDescription(request.getDescription());
        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder());
        }
        return toResponse(categoryRepository.save(category));
    }

    public void deleteCategory(String id) {
        Category category = categoryRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        category.setIsActive(false);
        categoryRepository.save(category);
    }

    private CategoryResponse toResponse(Category category) {
        return CategoryResponse.builder().id(category.getId()).name(category.getName()).slug(category.getSlug()).description(category.getDescription()).displayOrder(category.getDisplayOrder()).isActive(category.getIsActive()).createdAt(category.getCreatedAt()).updatedAt(category.getUpdatedAt()).build();
    }
}
