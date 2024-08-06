declare type userType = {
  id: string;
  name: string;
  username: string;
  desc: string;
  password?: string;
  pp?: string;
  ban?: boolean;
  isAdmin?: boolean;
  accessToken?: {
    accessNow: string;
    timeBefore: string;
  };
  followers?: any;
  following?: any;
};

declare type postType = {
  id: string;
  title: string;
  time: string;
  user: userType;
  like: {
    total: number;
    users: any;
  };
  replyTo: string;
  img?: string;
  repost?: userType | undefined;
  ogId?: string;
  reQuote?: postType;
};
