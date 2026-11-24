// The small line above a page's title: where you are, written as a path.
export default function Path({ to }: { to?: string }) {
  return (
    <p className="path">
      <span>~/northward{to ? "/" : ""}</span>
      {to}
    </p>
  );
}
