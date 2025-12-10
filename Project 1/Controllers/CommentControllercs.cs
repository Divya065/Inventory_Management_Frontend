using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Project_1.Dtos.Comment;
using Project_1.Extentions;
using Project_1.Interface;
using Project_1.Mappers;
using Project_1.Models;

namespace Project_1.Controllers
{
    [Route("api/[controller]")]

    public class CommentControllercs : ControllerBase
    {
        private readonly ICommentRepository _commentRepo;
        private readonly IStockRepository _stockRepo;
        private readonly UserManager<AppUser> _userManager;
        public CommentControllercs(ICommentRepository commentRepo, 
            IStockRepository stockRepo, UserManager<AppUser> userManager)
        {
            _commentRepo = commentRepo;
            _stockRepo = stockRepo;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if(!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var comments = await _commentRepo.GetAllAsync();
            var commentDto = comments.Select(x => x.ToCommentDto());
            return Ok(commentDto);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var comment = await _commentRepo.GetByIdAsync(id);

            if (comment == null)
            {
                return NotFound();
            }
            return Ok(comment.ToCommentDto());
        }

        [HttpPost("{stockId:int}")]
        [Authorize]
        public async Task<IActionResult> Create([FromRoute] int stockId)
        {
            // Read raw request body
            Request.EnableBuffering();
            Request.Body.Position = 0;
            string rawBody;
            using (var reader = new StreamReader(Request.Body, leaveOpen: true))
            {
                rawBody = await reader.ReadToEndAsync();
                Console.WriteLine($"Raw request body: {rawBody}");
            }
            Request.Body.Position = 0;

            // Manually deserialize to avoid model binding issues
            CreateCommentDto commentDto;
            try
            {
                commentDto = JsonConvert.DeserializeObject<CreateCommentDto>(rawBody);
                Console.WriteLine($"Deserialized - Title: '{commentDto?.Title}' (Length: {commentDto?.Title?.Length ?? 0})");
                Console.WriteLine($"Deserialized - Content: '{commentDto?.Content}' (Length: {commentDto?.Content?.Length ?? 0})");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Deserialization error: {ex.Message}");
                return BadRequest(new { message = "Invalid JSON format", error = ex.Message, receivedBody = rawBody });
            }

            // Validate manually
            if (commentDto == null)
            {
                return BadRequest(new { message = "Comment data is required", received = "null" });
            }

            if (string.IsNullOrWhiteSpace(commentDto.Title))
            {
                return BadRequest(new { message = "The Title field is required.", field = "title" });
            }

            if (string.IsNullOrWhiteSpace(commentDto.Content))
            {
                return BadRequest(new { message = "The Content field is required.", field = "content" });
            }

            if (commentDto.Title.Length < 5)
            {
                return BadRequest(new { message = "Title should be more than 5 characters", field = "title" });
            }

            if (commentDto.Content.Length < 5)
            {
                return BadRequest(new { message = "Content should be more than 5 characters", field = "content" });
            }

            if (commentDto.Title.Length > 280)
            {
                return BadRequest(new { message = "Title cannot be over 280 characters", field = "title" });
            }

            if (commentDto.Content.Length > 280)
            {
                return BadRequest(new { message = "Content cannot be over 280 characters", field = "content" });
            }

            if (!await _stockRepo.stockExist(stockId))
            {
                return NotFound("No stockid exist");
            }

            var username = User.GetUsername();
            if (string.IsNullOrEmpty(username))
            {
                return Unauthorized("User not authenticated");
            }

            var appUser = await _userManager.FindByNameAsync(username);
            if (appUser == null)
            {
                return Unauthorized("User not found");
            }

            var commentModel=commentDto.ToCommentFromCreate(stockId);
            commentModel.AppUserId = appUser.Id;

            await _commentRepo.CreateAsync(commentModel);
            return CreatedAtAction(nameof(GetById), new { id = commentModel.Id }, commentModel.ToCommentDto());
        }

        [HttpPut]
        [Route("{id:int}")]

        public async Task<IActionResult> Update([FromRoute] int id,[FromBody] UpdateCommentDto updateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var comment = await _commentRepo.UpdateAsync(id, updateDto.ToCommentFromUpdate());

            if (comment == null)
            {
                return NotFound("Comment not found");
            }
            return Ok(comment.ToCommentDto());
        }

        [HttpDelete]
        [Route("{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int id)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var comment = await _commentRepo.DeleteAsync(id);

            if (comment == null)
            {
                return NotFound();
            }
            return NoContent();
        }
    }
}
