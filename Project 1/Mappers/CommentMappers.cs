using Project_1.Dtos.Comment;
using Project_1.Models;

namespace Project_1.Mappers
{
    public static class CommentMappers
    {
        public static CommentDto ToCommentDto(this Comment CommentModel)
        {
            return new CommentDto
            {
                Id = CommentModel.Id,
                Title = CommentModel.Title,
                Content = CommentModel.Content,
                CreatedOn = CommentModel.CreatedOn,
                CreatedBy = CommentModel.AppUser?.UserName,
                StockId = CommentModel.StockId
            };
        }

        public static Comment ToCommentFromCreate(this CreateCommentDto CommentDto, int stockId)
        {
            return new Comment
            {
                Title = CommentDto.Title,
                Content = CommentDto.Content,
                StockId = stockId
            };
        }

        public static Comment ToCommentFromUpdate(this UpdateCommentDto CommentDto)
        {
            return new Comment
            {
                Title = CommentDto.Title,
                Content = CommentDto.Content,
            };
        }
    }
}
