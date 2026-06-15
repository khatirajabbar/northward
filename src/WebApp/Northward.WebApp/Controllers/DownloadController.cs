using Microsoft.AspNetCore.Mvc;

namespace Northward.WebApp.Controllers;

public class DownloadController : Controller
{
    public IActionResult Index()
    {
        return View();
    }
}
