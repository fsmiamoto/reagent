import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-python";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-java";

export type Token = {
  types: string[];
  content: string;
};

const fallbackTokenization = (code: string): Token[][] => {
  return code.split("\n").map((line) => [{ types: ["text"], content: line }]);
};

export const tokenizeToLines = (code: string, language?: string): Token[][] => {
  if (!language || !Prism.languages[language]) {
    return fallbackTokenization(code);
  }

  const tokens = Prism.tokenize(code, Prism.languages[language]);
  const lines: Token[][] = [];
  let currentLine: Token[] = [];

  const processToken = (
    token: Prism.Token | string,
    accumulatedTypes: string[] = [],
  ) => {
    if (typeof token === "string") {
      const parts = token.split("\n");
      parts.forEach((part, index) => {
        if (index > 0) {
          lines.push(currentLine);
          currentLine = [];
        }
        if (part) {
          currentLine.push({
            types: accumulatedTypes.length ? accumulatedTypes : ["text"],
            content: part,
          });
        }
      });
    } else {
      const newTypes = [...accumulatedTypes, token.type];
      if (Array.isArray(token.content)) {
        token.content.forEach((subToken) => processToken(subToken, newTypes));
      } else if (typeof token.content === "string") {
        processToken(token.content, newTypes);
      } else {
        processToken(token.content, newTypes);
      }
    }
  };

  tokens.forEach((token) => processToken(token));
  lines.push(currentLine);

  return lines;
};
