package mss.productservice.service;

import mss.productservice.model.*;
import mss.productservice.repository.*;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import mss.productservice.util.SlugUtil;

public interface IDataImportService {

    DataImportService.ImportResult importProducts(List<Product> products);
}
