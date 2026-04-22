using Project_1.Dtos.Offer;
using Project_1.Models;

namespace Project_1.Mappers
{
    public static class OfferMappers
    {
        public static OfferDto ToOfferDto(this Offer m)
        {
            return new OfferDto
            {
                Id = m.Id,
                Title = m.Title,
                Content = m.Content,
                CreatedOn = m.CreatedOn,
                CreatedBy = m.AppUser?.UserName ?? "",
                StockId = m.StockId
            };
        }
        public static Offer ToOfferFromCreate(this CreateOfferDto dto, int stockId)
        {
            return new Offer { Title = dto.Title, Content = dto.Content, StockId = stockId };
        }
        public static Offer ToOfferFromUpdate(this UpdateOfferDto dto)
        {
            return new Offer { Title = dto.Title, Content = dto.Content };
        }
    }
}
