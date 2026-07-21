// Project: SkinGuide - MSS301
// Author: NguyenTanXuan
// Service Component

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

public interface IBrandService {

    List<BrandResponse> getAllBrands();

    List<BrandResponse> getActiveBrands();

    BrandResponse getBrandById(String id);

    BrandResponse getBrandBySlug(String slug);

    List<BrandResponse> searchBrands(String keyword);

    BrandResponse createBrand(BrandRequest request);

    BrandResponse updateBrand(String id, BrandRequest request);

    void deleteBrand(String id);
}
