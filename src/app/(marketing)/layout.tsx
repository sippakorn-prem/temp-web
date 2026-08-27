// Marketing route group: public, indexable pages with their own header/footer. Importing the
// landing stylesheet here scopes it to this group rather than shipping it with the whole app.
import "./marketing.css";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
