using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace WebApplication2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HomeController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            var id= HttpContext.Session.GetString("Id");
            var username = HttpContext.Session.GetString("Username");
            if (string.IsNullOrEmpty(username))
                return Unauthorized("يجب تسجيل الدخول أولاً");

            var cne = HttpContext.Session.GetString("CNE");
            var role = HttpContext.Session.GetString("Role");

            return Ok(new { id,username, cne, role });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear(); // remove session data
            return Ok(new { message = "تم تسجيل الخروج" });
        }

    }

}
