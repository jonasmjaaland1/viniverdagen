"use client";
import React from "react";

type Props = { tekst: string; storrelse?: string };

function DelPaWhatsApp(props: Props) {
  var url = "https://wa.me/?text=" + encodeURIComponent(props.tekst);
  var klasse = "inline-block px-4 py-2 text-sm font-sans bg-green-600 text-white rounded";
  return React.createElement(
    "a",
    { href: url, target: "_blank", rel: "noopener noreferrer", className: klasse },
    "Del pa WhatsApp"
  );
}

export default DelPaWhatsApp;
