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

public interface ICategoryService {

    List<CategoryResponse> getAllCategories();

    List<CategoryResponse> getActiveCategories();

    CategoryResponse getCategoryById(String id);

    CategoryResponse getCategoryBySlug(String slug);

    CategoryResponse createCategory(CategoryRequest request);

    CategoryResponse updateCategory(String id, CategoryRequest request);

    void deleteCategory(String id);
}
