using Project_1.Dtos.Offer;
using Project_1.Models;

namespace Project_1.Mappers
{
    public static class OfferMappers
    {
        public static OfferDto ToOfferDto(this Offer m)
        {
            var buy = m.EffectiveBuyQty;
            var get = m.EffectiveGetQty;
            return new OfferDto
            {
                Id = m.Id,
                Title = m.Title,
                Content = m.Content,
                BuyQty = buy,
                GetQty = get,
                DiscountPercent = m.DiscountPercent,
                IsBuyOneGetOne = buy == 1 && get == 1,
                CreatedOn = m.CreatedOn,
                CreatedBy = m.AppUser?.UserName ?? "",
                ProductId = m.ProductId
            };
        }

        public static Offer ToOfferFromCreate(this CreateOfferDto dto, int productId)
        {
            var (buy, get, discount) = NormalizeDeal(dto.BuyQty, dto.GetQty, dto.IsBuyOneGetOne, dto.DiscountPercent);
            return new Offer
            {
                Title = dto.Title,
                Content = dto.Content,
                BuyQty = buy,
                GetQty = get,
                DiscountPercent = discount,
                IsBuyOneGetOne = buy == 1 && get == 1,
                ProductId = productId
            };
        }

        public static Offer ToOfferFromUpdate(this UpdateOfferDto dto)
        {
            var (buy, get, discount) = NormalizeDeal(dto.BuyQty, dto.GetQty, dto.IsBuyOneGetOne, dto.DiscountPercent);
            return new Offer
            {
                Title = dto.Title,
                Content = dto.Content,
                BuyQty = buy,
                GetQty = get,
                DiscountPercent = discount,
                IsBuyOneGetOne = buy == 1 && get == 1
            };
        }

        private static (int buy, int get, decimal discount) NormalizeDeal(
            int buyQty,
            int getQty,
            bool legacyBogo,
            decimal discountPercent)
        {
            var discount = discountPercent < 0 ? 0 : (discountPercent > 100 ? 100 : discountPercent);
            if (buyQty >= 1 && getQty >= 1) return (buyQty, getQty, 0);
            if (legacyBogo) return (1, 1, 0);
            if (discount > 0) return (0, 0, discount);
            return (0, 0, 0);
        }
    }
}
