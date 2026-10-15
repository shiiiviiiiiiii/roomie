export default function Cookies() {
  return (
    <div className="container legal">
      <h1>Cookie Policy</h1>
      <p className="muted">Last updated: <strong>[TODO: insert date]</strong></p>

      <h2>1. What cookies are</h2>
      <p>
        Cookies are small text files stored on your device when you visit a
        website. Roomie also uses browser local storage for a similar purpose
        (for example, to remember your cookie preferences). This policy explains
        what we use and why.
      </p>

      <h2>2. Cookies we use</h2>
      <table className="legal-table">
        <thead>
          <tr><th>Category</th><th>Purpose</th><th>Consent needed</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Necessary</td>
            <td>Keep you signed in, protect forms against forgery, load-balance requests and remember your cookie choice itself.</td>
            <td>No — always on</td>
          </tr>
          <tr>
            <td>Preferences</td>
            <td>Remember choices such as your city filter and display settings between visits.</td>
            <td>Yes</td>
          </tr>
          <tr>
            <td>Analytics</td>
            <td>Help us understand aggregate usage (e.g. which pages are popular) so we can improve Roomie.</td>
            <td>Yes</td>
          </tr>
          <tr>
            <td>Marketing</td>
            <td>Show you relevant Roomie updates and measure campaigns on other sites.</td>
            <td>Yes</td>
          </tr>
        </tbody>
      </table>
      <p>
        Third-party services embedded in Roomie (such as map tiles from
        OpenStreetMap and fonts from Google Fonts) may set their own cookies;
        those are governed by the respective providers&apos; policies.
      </p>

      <h2>3. Managing your choices</h2>
      <ul>
        <li>Use the <strong>&ldquo;Cookie settings&rdquo;</strong> link in the footer of any page to reopen your preferences at any time.</li>
        <li>You can also block or delete cookies in your browser settings — note that blocking necessary cookies will prevent you from signing in.</li>
      </ul>

      <h2>4. How long cookies last</h2>
      <p>
        Session cookies expire when you close your browser. Preference cookies,
        including your stored consent choice, last up to
        <strong> [TODO: e.g. 12 months]</strong> before we ask you again.
      </p>

      <h2>5. Contact</h2>
      <p>
        Questions about cookies: <strong>[TODO: privacy contact email]</strong>.
      </p>
    </div>
  );
}
