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
  bookmark?: any;
  notification?: {
    messages: string[];
    read: boolean;
  };
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
  replyTo: string | postType;
  img?: string;
  repost?: userType | undefined;
  ogId?: string;
  reQuote?: postType;
};
