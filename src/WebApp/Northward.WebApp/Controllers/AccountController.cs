using Microsoft.AspNetCore.Mvc;
using Northward.WebApp.Models;
using Northward.WebApp.Services;

namespace Northward.WebApp.Controllers;

public class AccountController : Controller
{
    private readonly AuthApiClient _authApi;

    public AccountController(AuthApiClient authApi)
    {
        _authApi = authApi;
    }

    [HttpGet]
    public IActionResult Register()
    {
        if (HttpContext.Session.GetString("AccessToken") is not null)
            return RedirectToAction("Profile");
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Register(RegisterViewModel model)
    {
        if (!ModelState.IsValid)
            return View(model);

        var result = await _authApi.RegisterAsync(model.Username, model.Email, model.Password);
        if (result is null || !result.Success || result.Data is null)
        {
            ModelState.AddModelError(string.Empty, result?.Error ?? "registration failed");
            return View(model);
        }

        SaveSession(result.Data);
        return RedirectToAction("Profile");
    }

    [HttpGet]
    public IActionResult Login()
    {
        if (HttpContext.Session.GetString("AccessToken") is not null)
            return RedirectToAction("Profile");
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginViewModel model)
    {
        if (!ModelState.IsValid)
            return View(model);

        var result = await _authApi.LoginAsync(model.Email, model.Password);
        if (result is null || !result.Success || result.Data is null)
        {
            ModelState.AddModelError(string.Empty, result?.Error ?? "invalid email or password");
            return View(model);
        }

        SaveSession(result.Data);
        return RedirectToAction("Profile");
    }

    [HttpGet]
    public async Task<IActionResult> Profile()
    {
        var token = HttpContext.Session.GetString("AccessToken");
        if (token is null) return RedirectToAction("Login");

        var profile = await _authApi.GetCurrentUserAsync(token);
        if (profile is null)
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login");
        }

        return View(profile);
    }

    [HttpGet]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return RedirectToAction("Index", "Home");
    }

    private void SaveSession(AuthResponse data)
    {
        HttpContext.Session.SetString("AccessToken", data.AccessToken);
        HttpContext.Session.SetString("RefreshToken", data.RefreshToken);
        HttpContext.Session.SetString("Username", data.Username);
        HttpContext.Session.SetString("UserId", data.UserId.ToString());
    }
}
