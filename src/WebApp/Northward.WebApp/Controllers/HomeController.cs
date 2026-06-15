using Microsoft.AspNetCore.Mvc;

namespace Northward.WebApp.Controllers;

public class HomeController : Controller
{
    public IActionResult Index()
    {
        return View();
    }

    public IActionResult About()
    {
        return View();
    }

    public IActionResult HowToPlay()
    {
        return View();
    }
}
