using System.Globalization;
using System.Text;

namespace Northward.Auth.Domain.Entities;

// What a traveler may be called. The name is shown to everyone on the
// leaderboard, so it's kept to something a table can show and nobody would
// mind reading:
//   - 3 to 20 characters;
//   - letters (from any language: ə, ü, ş, я, 中 …), numbers, spaces, and - _ .
//     — so no invisible names, emoji, or "glitch text" piled up out of accent marks;
//   - at least one letter or number;
//   - none of the blocked words below.
// A name that breaks a rule says which one, except for a blocked word: that
// only asks for a different name, so the list can't be read back by trying.
public static class UsernameRules
{
    public const int Shortest = 3;
    public const int Longest = 20;

    // the name as it's kept: spaces trimmed and runs of them made one, and
    // letters written the one standard way (an "ü" typed as u + dots becomes "ü")
    public static string Clean(string? name)
    {
        var composed = (name ?? string.Empty).Normalize(NormalizationForm.FormC);
        return string.Join(' ', composed.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }

    // what's wrong with a name, in words a player can read; null if nothing is
    public static string? Problem(string? name)
    {
        var clean = Clean(name);
        var length = clean.EnumerateRunes().Count();

        if (length < Shortest) return $"your name needs {Shortest} characters or more.";
        if (length > Longest) return $"your name can be {Longest} characters at most.";

        foreach (var rune in clean.EnumerateRunes())
        {
            if (Invisible.Contains(rune.Value) || !(Rune.IsLetter(rune) || Rune.IsDigit(rune) || Allowed.Contains(rune.Value)))
                return "your name can only have letters, numbers, spaces, and - _ .";
        }

        if (!clean.EnumerateRunes().Any(r => Rune.IsLetter(r) || Rune.IsDigit(r)))
            return "your name needs at least one letter or number.";

        if (IsBlocked(clean)) return "please choose a different name.";

        return null;
    }

    private static readonly HashSet<int> Allowed = [' ', '-', '_', '.'];

    // count as letters, but show as nothing at all
    private static readonly HashSet<int> Invisible = [0x115F, 0x1160, 0x3164, 0xFFA0];

    // ── the blocked words ──
    // Checked against the name with its accents taken off (ş → s, ə → e, ı → i),
    // its - _ . and spaces taken out, and numbers read as the letters they're
    // used for (0 → o, 1 → i, 3 → e, 4 → a, 5 → s, 7 → t), so "f.u.c.k" and
    // "5ik" are caught too. Cyrillic look-alike letters are read as Latin ones
    // for the Latin words ("аdmin" with a Russian "а").

    // wrong anywhere in a name. Only words long or unusual enough that they're
    // not hiding inside an ordinary name.
    private static readonly string[] Anywhere =
    [
        // English
        "fuck", "shit", "bitch", "cunt", "nigger", "nigga", "faggot", "whore", "slut", "pussy",
        "penis", "vagina", "porn", "rapist", "hitler", "retard", "wanker", "dickhead",
        // Azerbaijani
        "qehbe", "qanciq", "gijdillaq", "peyser", "dalbayob", "dalbayeb", "sikdir", "sikim", "sikerem",
        "siktir", "amciq", "ananisik",
        // Turkish
        "orospu", "yarrak", "gotveren", "pezevenk", "amcik", "sikerim",
        // Russian, written in Latin letters
        "blyat", "blyad", "pizda", "pizdec", "yebat", "mudak", "gandon", "pidor", "pidar",
        "huesos", "zaebal", "nahui", "nahuy",
        // pretending to be the game
        "northward",
    ];

    // Russian, written in Cyrillic: wrong anywhere
    private static readonly string[] AnywhereCyrillic =
    [
        "хуй", "хуе", "хуё", "пизд", "бляд", "блят", "ебат", "ёбан", "ебан", "сука", "пидор", "пидар",
        "мудак", "гандон", "шлюх",
    ];

    // wrong only as a whole word of the name (or the whole name), because
    // they're short enough to sit inside real names ("Nazim", "badminton", "Musiki")
    private static readonly HashSet<string> Whole =
    [
        "admin", "administrator", "moderator", "mod", "staff", "support", "official", "system",
        "nazi", "kkk", "rape", "dick", "ass", "cum", "sik", "amk", "pic", "ibne", "yarak", "huy", "suka",
    ];

    // the Cyrillic words read the same way as a name is (й, like ё, loses its mark)
    private static readonly string[] AnywhereCyrillicBare = AnywhereCyrillic.Select(Bare).Distinct().ToArray();

    private static bool IsBlocked(string name)
    {
        var plain = Bare(name);
        if (AnywhereCyrillicBare.Any(plain.Contains)) return true;

        var latin = Latin(plain);
        if (Anywhere.Any(latin.Contains)) return true;

        var words = name.Split([' ', '-', '_', '.'], StringSplitOptions.RemoveEmptyEntries).Select(w => Latin(Bare(w)));
        return Whole.Contains(latin) || words.Any(Whole.Contains);
    }

    // lower case, accents off, ı and ə read as i and e, the - _ . and spaces gone
    private static string Bare(string name)
    {
        var text = new StringBuilder();
        foreach (var c in name.ToLowerInvariant().Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            if (c is ' ' or '-' or '_' or '.') continue;
            text.Append(c switch { 'ı' => 'i', 'ə' => 'e', _ => c });
        }
        return text.ToString();
    }

    // numbers read as letters, and Cyrillic letters that look Latin read as Latin
    private static string Latin(string bare)
    {
        var text = new StringBuilder(bare.Length);
        foreach (var c in bare)
        {
            text.Append(c switch
            {
                '0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't',
                'а' => 'a', 'е' => 'e', 'о' => 'o', 'р' => 'p', 'с' => 'c', 'х' => 'x', 'у' => 'y',
                'і' => 'i', 'ј' => 'j', 'ѕ' => 's', 'к' => 'k', 'м' => 'm', 'т' => 't',
                _ => c
            });
        }
        return text.ToString();
    }
}
