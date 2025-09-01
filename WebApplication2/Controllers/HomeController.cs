using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace WebApplication2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HomeController : ControllerBase
    {
        // ----------------------------
        // GET: api/home
        // Returns the current logged-in user's info from session
        // ----------------------------
        [HttpGet]
        public IActionResult Get()
        {
            var id = HttpContext.Session.GetString("Id");
            var username = HttpContext.Session.GetString("Username");

            // If no username in session, user is not logged in
            if (string.IsNullOrEmpty(username))
                return Unauthorized("يجب تسجيل الدخول أولاً");

            var cne = HttpContext.Session.GetString("CNE");
            var role = HttpContext.Session.GetString("Role");

            return Ok(new { id, username, cne, role });
        }

        // ----------------------------
        // POST: api/home/logout
        // Logs out the user by clearing the session
        // ----------------------------
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear(); // remove all session data
            return Ok(new { message = "تم تسجيل الخروج" });
        }
    }
}
