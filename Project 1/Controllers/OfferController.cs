using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Project_1.Dtos.Offer;
using Project_1.Extentions;
using Project_1.Interface;
using Project_1.Mappers;
using Project_1.Models;

namespace Project_1.Controllers
{
    [Route("api/[controller]")]
    public class OfferController : ControllerBase
    {
        private readonly IOfferRepository _offerRepo;
        private readonly IStockRepository _stockRepo;
        private readonly UserManager<AppUser> _userManager;

        public OfferController(IOfferRepository offerRepo, IStockRepository stockRepo, UserManager<AppUser> userManager)
        {
            _offerRepo = offerRepo;
            _stockRepo = stockRepo;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var offers = await _offerRepo.GetAllAsync();
            return Ok(offers.Select(x => x.ToOfferDto()));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var offer = await _offerRepo.GetByIdAsync(id);
            if (offer == null)
                return NotFound();
            return Ok(offer.ToOfferDto());
        }

        [HttpPost("{stockId:int}")]
        [Authorize]
        public async Task<IActionResult> Create([FromRoute] int stockId)
        {
            Request.EnableBuffering();
            Request.Body.Position = 0;
            string rawBody;
            using (var reader = new StreamReader(Request.Body, leaveOpen: true))
            {
                rawBody = await reader.ReadToEndAsync();
            }
            Request.Body.Position = 0;

            CreateOfferDto offerDto;
            try
            {
                offerDto = JsonConvert.DeserializeObject<CreateOfferDto>(rawBody);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Invalid JSON format", error = ex.Message });
            }

            if (offerDto == null)
                return BadRequest(new { message = "Offer data is required" });
            if (string.IsNullOrWhiteSpace(offerDto.Title))
                return BadRequest(new { message = "The Title field is required.", field = "title" });
            if (string.IsNullOrWhiteSpace(offerDto.Content))
                return BadRequest(new { message = "The Content field is required.", field = "content" });
            if (offerDto.Title.Length < 5)
                return BadRequest(new { message = "Title should be more than 5 characters", field = "title" });
            if (offerDto.Content.Length < 5)
                return BadRequest(new { message = "Content should be more than 5 characters", field = "content" });
            if (offerDto.Title.Length > 280)
                return BadRequest(new { message = "Title cannot be over 280 characters", field = "title" });
            if (offerDto.Content.Length > 280)
                return BadRequest(new { message = "Content cannot be over 280 characters", field = "content" });

            if (!await _stockRepo.stockExist(stockId))
                return NotFound("Stock not found");

            var username = User.GetUsername();
            if (string.IsNullOrEmpty(username))
                return Unauthorized("User not authenticated");

            var appUser = await _userManager.FindByNameAsync(username);
            if (appUser == null)
                return Unauthorized("User not found");

            var offerModel = offerDto.ToOfferFromCreate(stockId);
            offerModel.AppUserId = appUser.Id;

            await _offerRepo.CreateAsync(offerModel);
            return CreatedAtAction(nameof(GetById), new { id = offerModel.Id }, offerModel.ToOfferDto());
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateOfferDto updateDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var offer = await _offerRepo.UpdateAsync(id, updateDto.ToOfferFromUpdate());
            if (offer == null)
                return NotFound("Offer not found");
            return Ok(offer.ToOfferDto());
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete([FromRoute] int id)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var offer = await _offerRepo.DeleteAsync(id);
            if (offer == null)
                return NotFound();
            return NoContent();
        }
    }
}
