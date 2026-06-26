package mss.productservice.service;

import mss.productservice.model.*;
import mss.productservice.repository.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class DataImportService {

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;
    private final IngredientRepository ingredientRepository;

    public DataImportService(ProductRepository productRepository, BrandRepository brandRepository, CategoryRepository categoryRepository, IngredientRepository ingredientRepository) {
        this.productRepository = productRepository;
        this.brandRepository = brandRepository;
        this.categoryRepository = categoryRepository;
        this.ingredientRepository = ingredientRepository;
    }

    public int importProducts(List<Product> products) {
        int count = 0;
        for (Product p : products) {
            // Handle Brand
            if (p.getBrandName() != null && !p.getBrandName().isEmpty()) {
                String brandSlug = p.getBrandName().toLowerCase().replaceAll("[^a-z0-9\\\\s-]", "").replaceAll("[\\\\s-]+", "-");
                Optional<Brand> existingBrand = brandRepository.findBySlug(brandSlug);
                if (existingBrand.isPresent()) {
                    p.setBrandId(existingBrand.get().getId());
                } else {
                    Brand newBrand = new Brand();
                    newBrand.setName(p.getBrandName());
                    newBrand.setSlug(brandSlug);
                    brandRepository.save(newBrand);
                    p.setBrandId(newBrand.getId());
                }
            }

            // Handle Category
            if (p.getCategoryName() != null && !p.getCategoryName().isEmpty()) {
                String catSlug = p.getCategoryName().toLowerCase().replaceAll("[^a-z0-9\\\\s-]", "").replaceAll("[\\\\s-]+", "-");
                Optional<Category> existingCategory = categoryRepository.findBySlug(catSlug);
                if (existingCategory.isPresent()) {
                    p.setCategoryId(existingCategory.get().getId());
                } else {
                    Category newCategory = new Category();
                    newCategory.setName(p.getCategoryName());
                    newCategory.setSlug(catSlug);
                    categoryRepository.save(newCategory);
                    p.setCategoryId(newCategory.getId());
                }
            }

            // Handle Ingredients
            if (p.getIngredients() != null) {
                List<ProductIngredient> updatedIngredients = new ArrayList<>();
                for (ProductIngredient pi : p.getIngredients()) {
                    if (pi.getName() == null || pi.getName().isEmpty()) continue;
                    
                    String ingSlug = pi.getName().trim().toLowerCase().replaceAll("[^a-z0-9\\\\s-]", "").replaceAll("[\\\\s-]+", "-");
                    Optional<Ingredient> existingIng = ingredientRepository.findBySlug(ingSlug);
                    if (existingIng.isPresent()) {
                        pi.setIngredientId(existingIng.get().getId());
                    } else {
                        Ingredient newIng = new Ingredient();
                        newIng.setName(pi.getName().trim());
                        newIng.setSlug(ingSlug);
                        ingredientRepository.save(newIng);
                        pi.setIngredientId(newIng.getId());
                    }
                    updatedIngredients.add(pi);
                }
                p.setIngredients(updatedIngredients);
            }

            p.setIsActive(true);
            productRepository.save(p);
            count++;
        }
        return count;
    }
}
