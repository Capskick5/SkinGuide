package mss.productservice.service;

import lombok.RequiredArgsConstructor;
import mss.productservice.dto.request.BrandRequest;
import mss.productservice.dto.response.BrandResponse;
import mss.productservice.exception.DuplicateResourceException;
import mss.productservice.exception.ResourceNotFoundException;
import mss.productservice.model.Brand;
import mss.productservice.repository.BrandRepository;
import mss.productservice.util.SlugUtil;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BrandService implements IBrandService {

    private final BrandRepository brandRepository;

    public List<BrandResponse> getAllBrands() {
        return brandRepository.findAll().stream().map(this::toResponse).toList();
    }

    public List<BrandResponse> getActiveBrands() {
        return brandRepository.findByIsActiveTrue().stream().map(this::toResponse).toList();
    }

    public BrandResponse getBrandById(String id) {
        Brand brand = brandRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Brand", "id", id));
        return toResponse(brand);
    }

    public BrandResponse getBrandBySlug(String slug) {
        Brand brand = brandRepository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Brand", "slug", slug));
        return toResponse(brand);
    }

    public List<BrandResponse> searchBrands(String keyword) {
        return brandRepository.findByNameContainingIgnoreCase(keyword).stream().map(this::toResponse).toList();
    }

    public BrandResponse createBrand(BrandRequest request) {
        String slug = SlugUtil.toSlug(request.getName());
        if (brandRepository.existsBySlug(slug)) {
            throw new DuplicateResourceException("Brand", "slug", slug);
        }
        Brand brand = Brand.builder().name(request.getName()).slug(slug).country(request.getCountry()).description(request.getDescription()).logoUrl(request.getLogoUrl()).isActive(true).build();
        return toResponse(brandRepository.save(brand));
    }

    public BrandResponse updateBrand(String id, BrandRequest request) {
        Brand brand = brandRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Brand", "id", id));
        String newSlug = SlugUtil.toSlug(request.getName());
        if (!newSlug.equals(brand.getSlug()) && brandRepository.existsBySlug(newSlug)) {
            throw new DuplicateResourceException("Brand", "slug", newSlug);
        }
        brand.setName(request.getName());
        brand.setSlug(newSlug);
        brand.setCountry(request.getCountry());
        brand.setDescription(request.getDescription());
        brand.setLogoUrl(request.getLogoUrl());
        return toResponse(brandRepository.save(brand));
    }

    public void deleteBrand(String id) {
        Brand brand = brandRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Brand", "id", id));
        brand.setIsActive(false);
        brandRepository.save(brand);
    }

    private BrandResponse toResponse(Brand brand) {
        return BrandResponse.builder().id(brand.getId()).name(brand.getName()).slug(brand.getSlug()).country(brand.getCountry()).description(brand.getDescription()).logoUrl(brand.getLogoUrl()).isActive(brand.getIsActive()).createdAt(brand.getCreatedAt()).updatedAt(brand.getUpdatedAt()).build();
    }
}
