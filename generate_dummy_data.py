def create_user(name, hash, salt, seed, date):
	return "insert into users values (NULL, '{0}', '{1}', '{2}', '{3}', {4}".format(name, hash, salt, seed, date)

def create_project():


def main(args):
	users = [ ("user{0}".format(index),)for index in range(10) ]
	for user in [ for index in range(10) ]

if __name__ == "__main__":
	main()