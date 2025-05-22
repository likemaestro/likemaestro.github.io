import React from "react";
import { Link } from "react-router-dom";

interface NavLinkProps {
  link: {
    id: string;
    label: string;
    type: string;
    path?: string;
    ariaLabel?: string;
  };
  isActive: boolean;
  onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

const NavLink: React.FC<NavLinkProps> = ({ link, isActive, onClick }) => {
  const commonLinkProps = {
    className: `nav-link-interactive text-lg hover:text-indigo-300 transition duration-300 ease-in-out transform focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-opacity-75 rounded-sm ${
      isActive ? " active" : ""
    }`,
    role: "menuitem",
  };

  if (link.type === "external") {
    return (
      <a
        href={link.path}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={link.ariaLabel || link.label}
        {...commonLinkProps}
      >
        {link.label}
      </a>
    );
  } else if (link.type === "page") {
    return (
      <Link
        to={link.path!}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        {...commonLinkProps}
      >
        {link.label}
      </Link>
    );
  } else {
    // mainSection: no routing, just scroll
    return (
      <a
        href="#"
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        {...commonLinkProps}
      >
        {link.label}
      </a>
    );
  }
};

export const NavSeparator = () => (
  <div className="h-6 w-px bg-gray-500 opacity-50" aria-hidden="true" />
);

export default NavLink;
