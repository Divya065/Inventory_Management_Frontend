using Project_1.Dtos.Product;
using Project_1.Helpers;
using Project_1.Models;

namespace Project_1.Mappers
{
    public static class ProductMappers
    {
        public static ProductDto ToProductDto(this Product productModel)
        {
            return new ProductDto
            {
                Id = productModel.Id,
                Symbol = productModel.Symbol,
                Brand = productModel.Brand,
                CompanyName = productModel.CompanyName,
                Barcode = productModel.Barcode,
                Price = StockPriceValidation.NormalizePrice(productModel.Price),
                Quantity = productModel.Quantity,
                MarketCap = StockPriceValidation.NormalizeMarketCap(productModel.MarketCap),
                ExpiryDate = productModel.ExpiryDate,
                ExpiryStatus = ExpiryFreshness.Status(productModel.ExpiryDate),
                Offers = (productModel.Offers ?? new List<Offer>()).Select(c => c.ToOfferDto()).ToList(),
            };
        }

        public static Product ToCreateFromProductDto(this CreateProductRequestDto productDto)
        {
            var barcode = string.IsNullOrWhiteSpace(productDto.Barcode) ? null : productDto.Barcode.Trim();
            var brand = string.IsNullOrWhiteSpace(productDto.Brand) ? null : productDto.Brand.Trim();
            return new Product
            {
                Symbol = productDto.Symbol,
                Brand = brand,
                CompanyName = productDto.CompanyName,
                Barcode = barcode,
                Price = productDto.Price,
                Quantity = productDto.Quantity,
                MarketCap = productDto.MarketCap,
                ExpiryDate = productDto.ExpiryDate,
            };
        }
    }
}
