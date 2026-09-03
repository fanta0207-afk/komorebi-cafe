export function PersonFallback({ look, apron = false }: { look: string; apron?: boolean }) {
  return <span className={`scene-person look-${look} ${apron ? "with-apron" : ""}`}>
    <i className="person-shadow"/><i className="person-legs"/><i className="person-body"/>
    <i className="person-arm arm-left"/><i className="person-arm arm-right"/>
    <i className="person-head"><b className="person-hair"/><b className="person-eyes"/><b className="person-cheeks"/></i>
  </span>;
}
