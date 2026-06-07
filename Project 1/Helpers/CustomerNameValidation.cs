using System.Text.RegularExpressions;

namespace Project_1.Helpers
{
    public static class CustomerNameValidation
    {
        private static readonly Regex Pattern = new(@"^[A-Za-z]+(?:\s+[A-Za-z]+)*$", RegexOptions.Compiled);

        public static bool TryValidate(string? name, out string trimmed, out string error)
        {
            trimmed = name?.Trim() ?? string.Empty;
            if (string.IsNullOrEmpty(trimmed))
            {
                error = "Customer name is required.";
                return false;
            }

            if (!Pattern.IsMatch(trimmed))
            {
                error = "Customer name must contain only letters (A–Z). Spaces between words are allowed.";
                return false;
            }

            error = string.Empty;
            return true;
        }
    }
}
