import React from 'react';
import './styles/ExplorePage.css';

// 1. Define props
interface Props {
  domain: string;
}

// 2. Accept props in the component
const ExplorePage: React.FC<Props> = ({ domain }) => {
  return (
    <div className="explore-page">
      <h1>Welcome to {domain}</h1>
    </div>
  );
};

export default ExplorePage;
